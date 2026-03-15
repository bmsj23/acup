import { WorkspaceModuleSkeleton } from "@/components/loading/page-skeletons";

type WorkspaceRouteLoadingProps = {
  statCount?: number;
  leftPanelCount?: number;
  rowCount?: number;
};

export default function WorkspaceRouteLoading({
  statCount = 4,
  leftPanelCount = 1,
  rowCount = 4,
}: WorkspaceRouteLoadingProps) {
  return (
    <WorkspaceModuleSkeleton
      statCount={statCount}
      leftPanelCount={leftPanelCount}
      rowCount={rowCount}
    />
  );
}
