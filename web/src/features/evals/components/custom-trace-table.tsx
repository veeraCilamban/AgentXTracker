import { useMemo } from "react";
import { api } from "@/src/utils/api";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";

type Trace = {
  id: string;
  timestamp: string;
  input: string;
  output: string;
  [key: string]: any;
};

interface TracesTableProps {
  traceIds: string[];
  projectId: string;
  selectedTrace: Trace | null;
  onTraceSelect: (trace: Trace) => void;
}

// Helper function to safely get trace data with fallbacks
const safeGetTraceData = (trace: any): Trace | null => {
  try {
    // Handle completely invalid input
    if (!trace || typeof trace !== "object") {
      return null;
    }

    // Handle arrays or other unexpected structures
    if (Array.isArray(trace)) {
      return null;
    }

    // Create safe trace object with comprehensive validation
    const safeTrace = {
      id:
        typeof trace.id === "string" && trace.id.trim()
          ? trace.id.trim()
          : `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: validateTimestamp(trace.timestamp),
      input: safeStringify(trace.input),
      output: safeStringify(trace.output),
      ...extractSafeProperties(trace), // Safely extract other properties
    };

    return safeTrace;
  } catch (error) {
    console.warn("Error in safeGetTraceData:", error);
    return null;
  }
};

// Helper to validate and format timestamp
const validateTimestamp = (timestamp: any): string => {
  try {
    if (!timestamp) return new Date().toISOString();

    if (typeof timestamp === "string") {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? new Date().toISOString() : timestamp;
    }

    if (typeof timestamp === "number") {
      const date = new Date(timestamp);
      return isNaN(date.getTime())
        ? new Date().toISOString()
        : date.toISOString();
    }

    if (timestamp instanceof Date) {
      return isNaN(timestamp.getTime())
        ? new Date().toISOString()
        : timestamp.toISOString();
    }

    return new Date().toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
};

// Helper to safely stringify any value for input/output
const safeStringify = (value: any): string => {
  try {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean")
      return String(value);
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch (jsonError) {
        return "[Complex Object]";
      }
    }
    return String(value);
  } catch (error) {
    return "[Invalid Data]";
  }
};

// Helper to safely extract other properties without breaking
const extractSafeProperties = (trace: any): Record<string, any> => {
  try {
    const safeProps: Record<string, any> = {};
    const excludeKeys = ["id", "timestamp", "input", "output"];

    for (const key in trace) {
      if (!excludeKeys.includes(key) && trace.hasOwnProperty(key)) {
        try {
          // Only include primitive values or simple objects
          const value = trace[key];
          if (value !== undefined && value !== null) {
            if (
              typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean"
            ) {
              safeProps[key] = value;
            } else if (typeof value === "object" && !Array.isArray(value)) {
              // Shallow copy for simple objects
              safeProps[key] = { ...value };
            }
          }
        } catch (propError) {
          // Skip problematic properties
          continue;
        }
      }
    }

    return safeProps;
  } catch (error) {
    return {};
  }
};

// Helper function to safely format timestamp
const safeFormatTimestamp = (timestamp: string | undefined | null) => {
  if (!timestamp) return "Invalid Date";

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    return date.toLocaleString();
  } catch (error) {
    return "Invalid Date";
  }
};

// Helper function to safely truncate ID
const safeTruncateId = (id: string | undefined | null) => {
  if (!id || typeof id !== "string") return "unknown";
  return id;
};

export const TracesTable = ({
  traceIds,
  projectId,
  selectedTrace,
  onTraceSelect,
}: TracesTableProps) => {
  // Now we can safely use hooks for each trace ID since this component
  // is only rendered when traceIds is not empty
  const detailedTracesQueries = traceIds.map((traceId) =>
    api.traces.byIdWithObservationsAndScores.useQuery(
      {
        traceId: traceId,
        projectId: projectId,
      },
      {
        enabled: !!traceId,
        retry(failureCount, error) {
          if (
            error.data?.code === "UNAUTHORIZED" ||
            error.data?.code === "NOT_FOUND"
          ) {
            return false;
          }
          return failureCount < 3;
        },
      },
    ),
  );

  // Get successful trace data with safe parsing and comprehensive error handling
  const detailedTraces = useMemo(() => {
    try {
      return detailedTracesQueries
        .map((query) => {
          try {
            // Handle query errors or invalid responses
            if (query.error || !query.data) return null;
            return query.data;
          } catch (error) {
            console.warn("Error processing query:", error);
            return null;
          }
        })
        .filter(Boolean)
        .map((data) => {
          try {
            return safeGetTraceData(data);
          } catch (error) {
            console.warn("Error parsing trace data:", error);
            return null;
          }
        })
        .filter(Boolean); // Remove any null results from safeGetTraceData
    } catch (error) {
      console.error("Critical error in detailedTraces processing:", error);
      return []; // Return empty array instead of crashing
    }
  }, [detailedTracesQueries]);

  // Loading state - check if any query is still loading
  const isLoading = detailedTracesQueries.some((query) => query.isLoading);

  // Error state - check if any query has an error
  const hasError = detailedTracesQueries.some((query) => query.error);
  const errorQueries = detailedTracesQueries.filter((query) => query.error);

  // Safe trace selection handler
  const handleTraceSelect = (trace: any) => {
    try {
      const safeTrace = safeGetTraceData(trace);
      if (safeTrace && onTraceSelect) {
        onTraceSelect(safeTrace);
      }
    } catch (error) {
      console.error("Error selecting trace:", error);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="mt-1 rounded-md border">
        <div className="h-[400px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-[50px]">Select</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Input</TableHead>
                <TableHead>Output</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center">
                  Loading detailed trace data...
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Show error state if all queries failed
  if (hasError && detailedTraces.length === 0) {
    return (
      <div className="mt-1 rounded-md border">
        <div className="h-[400px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-[50px]">Select</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Input</TableHead>
                <TableHead>Output</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-destructive"
                >
                  Error loading trace details
                  {errorQueries.length > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Failed to load {errorQueries.length} out of{" "}
                      {traceIds.length} traces
                    </div>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Render the traces table
  return (
    <div className="mt-1 rounded-md border">
      <div className="h-[400px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-[50px]">Select</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Input</TableHead>
              <TableHead>Output</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detailedTraces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center">
                  No detailed trace data available
                </TableCell>
              </TableRow>
            ) : (
              detailedTraces
                .map((trace) => {
                  // Additional safety check for each trace with error boundary
                  try {
                    if (!trace || !trace.id) {
                      return null;
                    }

                    return (
                      <TableRow key={trace.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Checkbox
                            checked={selectedTrace?.id === trace.id}
                            onCheckedChange={() => handleTraceSelect(trace)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {safeTruncateId(trace.id)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {safeFormatTimestamp(trace.timestamp)}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="truncate text-sm">
                            {trace.input || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="truncate text-sm">
                            {trace.output || "-"}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  } catch (rowError) {
                    console.warn("Error rendering trace row:", rowError, trace);
                    // Return a fallback row instead of crashing
                    return (
                      <TableRow
                        key={`error-${Math.random()}`}
                        className="bg-red-50"
                      >
                        <TableCell
                          colSpan={5}
                          className="py-2 text-center text-sm text-red-600"
                        >
                          Error displaying trace data
                        </TableCell>
                      </TableRow>
                    );
                  }
                })
                .filter(Boolean) // Remove any null results
            )}
          </TableBody>
        </Table>
      </div>

      {/* Show partial error state if some queries failed but we have some data */}
      {hasError && detailedTraces.length > 0 && (
        <div className="border-t bg-amber-50 px-4 py-2 text-sm text-amber-600">
          Warning: {errorQueries.length} out of {traceIds.length} traces failed
          to load
        </div>
      )}
    </div>
  );
};
