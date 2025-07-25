import Page from "@/src/components/layouts/page";
import { BreadcrumbSeparator } from "@/src/components/ui/breadcrumb";
import { BreadcrumbPage } from "@/src/components/ui/breadcrumb";
import { BreadcrumbItem } from "@/src/components/ui/breadcrumb";
import { Check } from "lucide-react";
import { cn } from "@/src/utils/tailwind";
import { BreadcrumbList } from "@/src/components/ui/breadcrumb";
import { Breadcrumb } from "@/src/components/ui/breadcrumb";
import { useRouter } from "next/router";
import { SelectEvaluatorList } from "@/src/features/evals/components/select-evaluator-list";
import { RunEvaluatorForm } from "@/src/features/evals/components/run-evaluator-form";
import { api } from "@/src/utils/api";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { getMaintainer } from "@/src/features/evals/utils/typeHelpers";
import { MaintainerTooltip } from "@/src/features/evals/components/maintainer-tooltip";
import { ManageDefaultEvalModel } from "@/src/features/evals/components/manage-default-eval-model";
import { EvalTemplate } from "@langfuse/shared";

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

// Multi-step setup process
// 1. Select Evaluator: /project/:projectId/evals/new
// 2. Configure Evaluator: /project/:projectId/evals/new?evaluator=:evaluatorId
export default function NewEvaluatorPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const evaluatorId = router.query.evaluator as string | undefined;
  // starts at 1 to align with breadcrumb
  const stepInt = !evaluatorId ? 1 : 2;

  const hasAccess = useHasProjectAccess({
    projectId,
    scope: "evalTemplate:CUD",
  });

  const evalTemplates = api.evals.allTemplates.useQuery(
    {
      projectId,
      limit: 500,
      page: 0,
    },
    {
      enabled: hasAccess,
    },
  );

  const templates: EvalTemplate[] = [
    ...(evalTemplates.data?.templates?.filter(
      (t): t is EvalTemplate => t !== undefined,
    ) || []),
    ...newEvalTemplates,
  ];

  const currentTemplate = templates.find((t) => t.id === evaluatorId);

  if (!hasAccess) {
    return <div>You do not have access to this page.</div>;
  }

  return (
    <Page
      withPadding
      headerProps={{
        title: "Set up evaluator",
        breadcrumb: [
          {
            name: "Running Evaluators",
            href: `/project/${projectId}/evals`,
          },
        ],
        actionButtonsRight: <ManageDefaultEvalModel projectId={projectId} />,
      }}
    >
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem
            className="hover:cursor-pointer"
            onClick={() => router.push(`/project/${projectId}/evals/new`)}
          >
            <BreadcrumbPage
              className={cn(
                stepInt !== 1
                  ? "text-muted-foreground"
                  : "font-semibold text-foreground",
              )}
            >
              1. Select Evaluator
              {stepInt > 1 && <Check className="ml-1 inline-block h-3 w-3" />}
            </BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage
              className={cn(
                stepInt !== 2
                  ? "text-muted-foreground"
                  : "font-semibold text-foreground",
              )}
            >
              <div className="flex flex-row">
                2. Run Evaluator
                {currentTemplate && (
                  <div className="flex flex-row gap-2">
                    <span>
                      {currentTemplate.name ? `: ${currentTemplate.name}` : ""}
                    </span>
                    <MaintainerTooltip
                      maintainer={getMaintainer(currentTemplate)}
                    />
                  </div>
                )}
              </div>
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {
        // 1. Create Org
        stepInt === 1 && projectId && (
          <SelectEvaluatorList projectId={projectId} />
        )
      }
      {
        // 2. Run Evaluator
        stepInt === 2 && evaluatorId && projectId && (
          <RunEvaluatorForm
            projectId={projectId}
            evaluatorId={evaluatorId}
            evalTemplates={templates}
          />
        )
      }
    </Page>
  );
}
