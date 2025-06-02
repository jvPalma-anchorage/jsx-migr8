import { ComponentUsage } from "@/types";
import { ProjectGraph } from "../graph/types";
import { getPropValue } from "../utils/props";

export function graphToComponentSummary(graph: ProjectGraph) {
  const summary: Record<string, Record<string, ComponentUsage[]>> = {};
  graph.jsx.forEach((j) => {
    const { pkg } = j.importRef;
    const comp =
      j.importRef.imported === "default"
        ? j.importRef.local
        : j.importRef.imported;

    const item: ComponentUsage = {
      props: Object.fromEntries(
        Object.entries(j.props).map(([k, v]) => [k, getPropValue(v)]) // old behaviour
      ),
      impObj: j.importRef,
      originalProps: {},
    };
    item.originalProps = item.props;

    ((summary[pkg] ||= {})[comp] ||= []).push(item);
  });
  return summary;
}
