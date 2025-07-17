export function getNameChange(name: string): string {
  if (!name) return "";
  return name.replace(/Langfuse/gi, "AutoX");
}
