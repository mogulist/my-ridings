import { BoostApp } from "../../_components/BoostApp";
import { demoData } from "../_lib/demo-data";

export const dynamic = "force-dynamic";

export default function WorkflowDemoPage() {
	return <BoostApp demo initialData={demoData()} />;
}
