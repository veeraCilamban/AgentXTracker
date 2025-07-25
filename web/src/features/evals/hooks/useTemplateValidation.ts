import { useEffect } from "react";
import { api } from "@/src/utils/api";
import { useState } from "react";
import { type EvalTemplate } from "@langfuse/shared/src/db";

// export function useTemplateValidation({ projectId }: { projectId: string }) {
//   const [selectedTemplate, setSelectedTemplate] = useState<EvalTemplate | null>(
//     null,
//   );
//   const [isSelectionValid, setIsSelectionValid] = useState(true);

//   const defaultModel = api.defaultLlmModel.fetchDefaultModel.useQuery({
//     projectId,
//   });

//   // validate that either a default eval model is set or the selected eval has a custom model
//   useEffect(() => {
//     if (selectedTemplate) {
//       if (!(selectedTemplate.provider || defaultModel.data?.provider)) {
//         setIsSelectionValid(false);
//         return;
//       }

//       if (!(selectedTemplate.model || defaultModel.data?.model)) {
//         setIsSelectionValid(false);
//         return;
//       }
//       setIsSelectionValid(true);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedTemplate?.id]);

//   return { isSelectionValid, selectedTemplate, setSelectedTemplate };
// }

export function useTemplateValidation({ projectId }: { projectId: string }) {
  const [selectedTemplate, setSelectedTemplate] = useState<EvalTemplate | null>(
    null,
  );
  const [isSelectionValid, setIsSelectionValid] = useState(true);

  const defaultModel = api.defaultLlmModel.fetchDefaultModel.useQuery({
    projectId,
  });

  // List of evaluators that don't require model validation
  const BYPASS_VALIDATION_TEMPLATES = new Set([
    "Agent Performance",
    "Agent Quality",
  ]);

  useEffect(() => {
    if (selectedTemplate) {
      // Skip validation for our specific evaluators
      console.log(selectedTemplate, "Selected Template");
      if (BYPASS_VALIDATION_TEMPLATES.has(selectedTemplate.name)) {
        setIsSelectionValid(true);
        return;
      }

      if (!(selectedTemplate.provider || defaultModel.data?.provider)) {
        setIsSelectionValid(false);
        return;
      }

      if (!(selectedTemplate.model || defaultModel.data?.model)) {
        setIsSelectionValid(false);
        return;
      }
      setIsSelectionValid(true);
    }
  }, [selectedTemplate, defaultModel.data]);

  return { isSelectionValid, selectedTemplate, setSelectedTemplate };
}
