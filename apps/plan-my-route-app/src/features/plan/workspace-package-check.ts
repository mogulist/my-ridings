import { PLAN_GEOMETRY_PACKAGE_VERSION } from '@my-ridings/plan-geometry';

/** Runtime guard: Metro + workspace resolution for @my-ridings/plan-geometry (P0-a). */
export function assertPlanGeometryPackageLinked(): void {
	if (typeof PLAN_GEOMETRY_PACKAGE_VERSION !== 'number') {
		throw new Error('@my-ridings/plan-geometry failed to resolve');
	}
}
