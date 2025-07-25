import { useState, useEffect } from "react";
import { api } from "@/src/utils/api";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Switch } from "@/src/components/ui/switch";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Textarea } from "@/src/components/ui/textarea";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import { X, Check, FileText } from "lucide-react";

interface AutoXEvalFormProps {
  projectId: string;
  id?: string;
}

type UploadedJson = (Record<string, unknown> & { fileName?: string }) | null;
type EvaluationResult = Record<string, unknown> | string | null;

const mockShoeTraces = [
  {
    id: "trace-001",
    timestamp: "2023-05-15T10:30:00Z",
    name: "Nike Air Max",
    input: "Looking for comfortable running shoes with good cushioning",
    output: "Recommended Nike Air Max with detailed specifications",
  },
  {
    id: "trace-002",
    timestamp: "2023-05-15T11:45:00Z",
    name: "Adidas Ultraboost",
    input: "Need lightweight shoes for marathon training",
    output: "Suggested Adidas Ultraboost with energy return technology",
  },
  {
    id: "trace-003",
    timestamp: "2023-05-16T09:15:00Z",
    name: "New Balance 990",
    input: "Searching for stability shoes with wide width options",
    output: "Proposed New Balance 990 with stability features",
  },
  {
    id: "trace-004",
    timestamp: "2023-05-16T14:20:00Z",
    name: "Hoka Clifton",
    input: "Request for max cushion shoes for long distance running",
    output: "Recommended Hoka Clifton with meta-rocker technology",
  },
  {
    id: "trace-005",
    timestamp: "2023-05-17T16:10:00Z",
    name: "Brooks Ghost",
    input: "Neutral running shoes for daily training",
    output: "Suggested Brooks Ghost with DNA LOFT cushioning",
  },
];

type DropdownItem = {
  category: string;
  options: string[];
};

export const AutoXEvalForm = ({ projectId, id }: AutoXEvalFormProps) => {
  const [selectedTraceIds, setSelectedTraceIds] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [uploadedJson, setUploadedJson] = useState<UploadedJson>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult>(null);
  const [traces, setTraces] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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

  useEffect(() => {
    const fetchTraces = async () => {
      //   try {
      //     setError(null);
      //     const queryParams = {
      //       projectId,
      //       filter: [],
      //       searchQuery: null,
      //       searchType: ["id", "content"] as ("id" | "content")[],
      //       page: 0,
      //       limit: 50,
      //       orderBy: {
      //         column: "timestamp",
      //         order: "DESC" as "ASC" | "DESC",
      //       },
      //     };

      //     const response = await api.traces.all.useQuery(queryParams);

      //     if (response.data?.traces) {
      //       setTraces(response.data.traces);
      //     }
      //   } catch (err) {
      //     console.error("Error fetching traces:", err);
      //     setError("Failed to load traces from the API");
      //   }

      setTraces(mockShoeTraces);
    };

    fetchTraces();
  }, [projectId]);

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

  const handleTraceSelection = (traceId: string) => {
    setSelectedTraceIds((prev) =>
      prev.includes(traceId)
        ? prev.filter((id) => id !== traceId)
        : [...prev, traceId],
    );
  };

  const handleSelectAll = () => {
    if (selectedTraceIds.length === traces.length) {
      setSelectedTraceIds([]);
    } else {
      setSelectedTraceIds(traces.map((trace) => trace.id));
    }
  };

  const handleItemSelect = (value: string) => {
    if (!selectedItems.includes(value)) {
      setSelectedItems([...selectedItems, value]);
    }
  };

  const handleItemRemove = (itemToRemove: string) => {
    setSelectedItems(selectedItems.filter((item) => item !== itemToRemove));
  };

  const executeEvaluation = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt for the evaluation");
      return;
    }

    if (selectedTraceIds.length === 0) {
      setError("Please select at least one trace to evaluate");
      return;
    }

    if (selectedItems.length === 0) {
      setError("Please select at least one item to evaluate");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const selectedTraces = traces.filter((trace) =>
        selectedTraceIds.includes(trace.id),
      );

      const response = await fetch("/api/your-custom-eval-endpoint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          uploadedJson,
          traceData: selectedTraces,
          prompt,
          selectedItems,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const evaluationResult = (await response.json()) as EvaluationResult;
      setResult(evaluationResult);
    } catch (err) {
      console.error("Evaluation failed:", err);
      setError("There was an error executing the evaluation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="">
      {/* 1. Upload Golden Traces Button - Only show for performance */}
      {id === "autox-agent-performance" && (
        <div className="mt-5 flex flex-col items-start gap-2">
          <Button variant="outline" asChild>
            <label className="flex cursor-pointer items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-primary">Upload Golden Traces</span>
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
                <span className="font-medium">File uploaded</span>
                <span className="text-muted-foreground">
                  {uploadedJson.fileName || "data.json"}
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
        <div className="mt-1 rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      selectedTraceIds.length === traces.length &&
                      traces.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Input</TableHead>
                <TableHead>Output</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {traces.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    {error ? `Error: ${error}` : "Loading traces..."}
                  </TableCell>
                </TableRow>
              ) : (
                traces.map((trace) => (
                  <TableRow key={trace.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTraceIds.includes(trace.id)}
                        onCheckedChange={() => handleTraceSelection(trace.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(trace.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono">
                      {trace.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {(trace.input as string)?.substring(0, 50)}...
                    </TableCell>
                    <TableCell>
                      {(trace.output as string)?.substring(0, 50)}...
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 3. Action Row */}
      <div className="mt-5">
        <div className="flex flex-row justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Dropdown */}
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

            {/* Selected items */}
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
              <Button onClick={executeEvaluation} disabled={isLoading}>
                {isLoading ? "Executing..." : "Execute"}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label htmlFor="preview-toggle">Show preview</Label>
              <Switch
                id="preview-toggle"
                checked={showPreview}
                onCheckedChange={setShowPreview}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Prompt Textbox */}
      <div className="mt-5">
        <Textarea
          id="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your evaluation prompt..."
          rows={4}
          className="mt-2"
        />
      </div>

      {/* 5. Results Textbox */}
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
              rows={8}
              className="mt-2 font-mono text-sm"
            />
          </div>
        </Card>
      )}
    </div>
  );
};
