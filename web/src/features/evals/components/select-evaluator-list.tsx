import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "@/src/utils/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { PlusIcon } from "lucide-react";
import { EvaluatorSelector } from "./evaluator-selector";
import { EvalTemplateForm } from "./template-form";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { SetupDefaultEvalModelCard } from "@/src/features/evals/components/set-up-default-eval-model-card";
import { useTemplateValidation } from "@/src/features/evals/hooks/useTemplateValidation";
import { Card } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { type EvalTemplate } from "@langfuse/shared";

type SelectEvaluatorListProps = {
  projectId: string;
};

const newEvalTemplates: EvalTemplate[] = [
  {
    id: "autox-agent-performance",
    createdAt: new Date(),
    updatedAt: new Date(),
    projectId: null,
    name: "Agent Performance",
    version: 1,
    prompt:
      "Evaluate the performance of an AI agent on a continuous scale from 0 to 1. Consider factors like task completion speed, accuracy, and adherence to instructions. Score 1 for optimal performance and 0 for failure.\n\nExample:\nTask: {{task}}\nAgent Output: {{agent_output}}\nExpected Behavior: {{expected_behavior}}\n\nScore: {{score}}\nReasoning: {{reasoning}}",
    partner: null,
    model: null,
    provider: null,
    modelParams: null,
    vars: ["task", "agent_output", "expected_behavior"],
    outputSchema: {
      score:
        "Score between 0 and 1. Score 0 if performance is poor, 1 if excellent",
      reasoning: "Detailed evaluation of the agent's performance",
    },
  },
  {
    id: "autox-agent-quality",
    createdAt: new Date(),
    updatedAt: new Date(),
    projectId: null,
    name: "Agent Quality",
    version: 1,
    prompt:
      "Assess the overall quality of an AI agent's response on a scale from 0 to 1. Consider clarity, coherence, relevance, and usefulness. Score 1 for high-quality responses and 0 for low-quality ones.\n\nExample:\nQuery: {{query}}\nAgent Response: {{agent_response}}\n\nScore: {{score}}\nReasoning: {{reasoning}}",
    partner: null,
    model: null,
    provider: null,
    modelParams: null,
    vars: ["query", "agent_response"],
    outputSchema: {
      score:
        "Score between 0 and 1. Score 0 if quality is poor, 1 if excellent",
      reasoning: "Detailed assessment of response quality",
    },
  },
];

export function SelectEvaluatorList({ projectId }: SelectEvaluatorListProps) {
  const router = useRouter();
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);

  const { isSelectionValid, selectedTemplate, setSelectedTemplate } =
    useTemplateValidation({ projectId });

  // Fetch templates
  const templates = api.evals.allTemplates.useQuery(
    {
      projectId,
    },
    {
      enabled: Boolean(projectId),
    },
  );

  const allTemplates = [
    ...(templates.data?.templates || []),
    ...newEvalTemplates,
  ];

  console.log("templetes", templates);

  const utils = api.useUtils();

  const handleOpenCreateEvaluator = () => {
    setIsCreateTemplateOpen(true);
  };

  const handleSelectEvaluator = () => {
    if (selectedTemplate) {
      router.push(
        `/project/${projectId}/evals/new?evaluator=${selectedTemplate.id}`,
      );
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = allTemplates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
    }
  };

  return (
    <>
      <Card className="grid max-h-[90vh] grid-rows-[auto_1fr_auto] overflow-hidden p-3">
        <div className="flex flex-col overflow-hidden">
          {templates.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : templates.isError ? (
            <div className="py-8 text-center text-destructive">
              Error: {templates.error.message}
            </div>
          ) : templates.data?.templates.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No evaluators found. Create a new evaluator to get started.
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <EvaluatorSelector
                projectId={projectId}
                evalTemplates={allTemplates}
                selectedTemplateId={selectedTemplate?.id || undefined}
                onTemplateSelect={(templateId) => {
                  console.log(templateId, "Temlplate Id.1");
                  handleTemplateSelect(templateId);
                }}
              />
            </div>
          )}
        </div>

        {!isSelectionValid && (
          <div className="px-4">
            <SetupDefaultEvalModelCard projectId={projectId} />
          </div>
        )}
      </Card>

      <div className="mt-2 flex flex-row justify-end">
        <div className="flex justify-end gap-2">
          <Button onClick={handleOpenCreateEvaluator} variant="outline">
            <PlusIcon className="mr-2 h-4 w-4" />
            Create Custom Evaluator
          </Button>
          <Button
            onClick={handleSelectEvaluator}
            disabled={!selectedTemplate || !isSelectionValid}
          >
            Use Selected Evaluator
          </Button>
        </div>
      </div>

      <Dialog
        open={isCreateTemplateOpen}
        onOpenChange={setIsCreateTemplateOpen}
      >
        <DialogContent className="max-h-[90vh] max-w-screen-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create new evaluator</DialogTitle>
          </DialogHeader>
          <EvalTemplateForm
            projectId={projectId}
            preventRedirect={true}
            isEditing={true}
            useDialog={true}
            onFormSuccess={(newTemplate) => {
              setIsCreateTemplateOpen(false);
              void utils.evals.allTemplates.invalidate();
              if (newTemplate) {
                setSelectedTemplate(newTemplate);
              }
              showSuccessToast({
                title: "Evaluator created successfully",
                description: "You can now use this evaluator.",
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
