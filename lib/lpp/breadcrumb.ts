export type LppBreadcrumbAction = "catalog" | "editor" | "drafts-root";

export type LppBreadcrumbItemState = {
  id: string;
  label: string;
  action?: LppBreadcrumbAction;
  current?: boolean;
};

/** Builds shadcn Breadcrumb items for the active LPP screen, template, or draft folder. */
export function buildLppBreadcrumbItems({
  screen,
  templateName,
  reportTitle,
  folderName,
}: {
  screen: "editor" | "drafts";
  templateName?: string | null;
  reportTitle?: string | null;
  folderName?: string | null;
}): LppBreadcrumbItemState[] {
  if (screen === "drafts") {
    const cleanFolder = folderName?.trim();
    if (!cleanFolder) {
      return [
        { id: "lpp", label: "LPP", action: "editor" },
        { id: "drafts", label: "Draf", current: true },
      ];
    }
    return [
      { id: "lpp", label: "LPP", action: "editor" },
      { id: "drafts", label: "Draf", action: "drafts-root" },
      { id: "folder", label: cleanFolder, current: true },
    ];
  }

  const cleanTemplate = templateName?.trim();
  if (!cleanTemplate) {
    return [
      { id: "lpp", label: "LPP" },
      { id: "catalog", label: "Daftar template", current: true },
    ];
  }

  const activeLabel = reportTitle?.trim() || cleanTemplate;
  return [
    { id: "lpp", label: "LPP", action: "catalog" },
    { id: "catalog", label: "Daftar template", action: "catalog" },
    { id: "document", label: activeLabel, current: true },
  ];
}
