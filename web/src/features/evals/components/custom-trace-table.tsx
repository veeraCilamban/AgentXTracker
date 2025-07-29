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
        timestamp: new Date(),
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

  // Get successful trace data
  const detailedTraces = useMemo(() => {
    return detailedTracesQueries.map((query) => query.data).filter(Boolean);
  }, [detailedTracesQueries]);

  // Loading state - check if any query is still loading
  const isLoading = detailedTracesQueries.some((query) => query.isLoading);

  // Error state - check if any query has an error
  const hasError = detailedTracesQueries.some((query) => query.error);
  const errorQueries = detailedTracesQueries.filter((query) => query.error);

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
              detailedTraces.map((trace: any) => (
                <TableRow key={trace.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedTrace?.id === trace.id}
                      onCheckedChange={() => onTraceSelect(trace)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {trace.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(trace.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="truncate text-sm">{trace.input || "-"}</div>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="truncate text-sm">
                      {trace.output || "-"}
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
