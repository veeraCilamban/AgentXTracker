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

type Score = {
  id: string;
  timestamp: string;
  name: string;
  value: number;
  comment?: string;
  [key: string]: any;
};

type Observation = {
  id: string;
  type: string;
  name: string;
  startTime: string;
  endTime: string;
  [key: string]: any;
};

export type Trace = {
  id: string;
  timestamp: string;
  input: string;
  output: string;
  projectId: string;
  name: string;
  environment: string;
  tags: string[];
  bookmarked: boolean;
  userId: string;
  sessionId: string;
  public: boolean;
  metadata: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  scores: Score[];
  observations: Observation[];
  latency: number;
  [key: string]: any;
};

interface TracesTableProps {
  traceIds: string[];
  projectId: string;
  selectedTrace: { trace: Trace } | null;
  onTraceSelect: (trace: { trace: Trace }) => void;
}

const validateTimestamp = (timestamp: any): string => {
  try {
    if (!timestamp) return new Date().toISOString();

    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    }

    if (timestamp instanceof Date) {
      return isNaN(timestamp.getTime()) ? new Date().toISOString() : timestamp.toISOString();
    }

    return new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
};

const safeStringify = (value: any): string => {
  try {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return JSON.stringify(value, null, 2);
  } catch {
    return "[Invalid Data]";
  }
};

const safeGetTraceData = (rawTrace: any): { trace: Trace } | null => {
  try {
    if (!rawTrace || typeof rawTrace !== 'object' || Array.isArray(rawTrace)) {
      return null;
    }

    // Handle the case where the trace might already be wrapped
    const traceData = rawTrace.trace || rawTrace;

    const safeTrace: Trace = {
      id: typeof traceData.id === 'string' ? traceData.id : `temp-${Date.now()}`,
      timestamp: validateTimestamp(traceData.timestamp),
      input: safeStringify(traceData.input),
      output: safeStringify(traceData.output),
      projectId: traceData.projectId || '',
      name: traceData.name || '',
      environment: traceData.environment || 'default',
      tags: Array.isArray(traceData.tags) ? traceData.tags : [],
      bookmarked: !!traceData.bookmarked,
      userId: traceData.userId || '',
      sessionId: traceData.sessionId || '',
      public: !!traceData.public,
      metadata: typeof traceData.metadata === 'string' 
        ? traceData.metadata 
        : JSON.stringify(traceData.metadata || {}, null, 2),
      createdAt: traceData.createdAt ? new Date(traceData.createdAt) : new Date(),
      updatedAt: traceData.updatedAt ? new Date(traceData.updatedAt) : new Date(),
      scores: Array.isArray(traceData.scores) 
        ? traceData.scores.map((score: any) => ({
            id: score.id || '',
            timestamp: validateTimestamp(score.timestamp),
            name: score.name || '',
            value: typeof score.value === 'number' ? score.value : 0,
            comment: score.comment || '',
            ...score
          }))
        : [],
      observations: Array.isArray(traceData.observations)
        ? traceData.observations.map((obs: any) => ({
            id: obs.id || '',
            type: obs.type || '',
            name: obs.name || '',
            startTime: validateTimestamp(obs.startTime),
            endTime: validateTimestamp(obs.endTime),
            ...obs
          }))
        : [],
      latency: typeof traceData.latency === 'number' ? traceData.latency : 0,
    };

    // Preserve all other properties
    for (const key in traceData) {
      if (!safeTrace.hasOwnProperty(key) && traceData.hasOwnProperty(key)) {
        try {
          safeTrace[key] = traceData[key];
        } catch (error) {
          console.warn(`Failed to copy property ${key}`, error);
        }
      }
    }

    return { trace: safeTrace };
  } catch (error) {
    console.error("Error in safeGetTraceData:", error);
    return null;
  }
};

const safeFormatTimestamp = (timestamp: string | undefined | null) => {
  if (!timestamp) return "Invalid Date";
  try {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleString();
  } catch {
    return "Invalid Date";
  }
};

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
      }
    )
  );

  const detailedTraces = useMemo(() => {
    try {
      return detailedTracesQueries
        .map((query) => {
          try {
            if (query.error || !query.data) return null;
            return query.data;
          } catch (error) {
            console.warn("Error processing query:", error);
            return null;
          }
        })
        .filter(Boolean)
        .map((data) => safeGetTraceData(data))
        .filter(Boolean) as { trace: Trace }[];
    } catch (error) {
      console.error("Critical error in detailedTraces processing:", error);
      return [];
    }
  }, [detailedTracesQueries]);

  const isLoading = detailedTracesQueries.some((query) => query.isLoading);
  const hasError = detailedTracesQueries.some((query) => query.error);
  const errorQueries = detailedTracesQueries.filter((query) => query.error);

  const handleTraceSelect = (trace: Trace) => {
    try {
      const safeTrace = safeGetTraceData(trace);
      if (safeTrace && onTraceSelect) {
        onTraceSelect(safeTrace);
      }
    } catch (error) {
      console.error("Error selecting trace:", error);
    }
  };

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
              detailedTraces.map(({ trace }) => {
                if (!trace || !trace.id) return null;

                return (
                  <TableRow key={trace.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedTrace?.trace?.id === trace.id}
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
              })
            )}
          </TableBody>
        </Table>
      </div>

      {hasError && detailedTraces.length > 0 && (
        <div className="border-t bg-amber-50 px-4 py-2 text-sm text-amber-600">
          Warning: {errorQueries.length} out of {traceIds.length} traces failed
          to load
        </div>
      )}
    </div>
  );
};