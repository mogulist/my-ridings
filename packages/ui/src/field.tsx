"use client";

import type * as React from "react";
import { cn } from "./utils";
import { Label } from "./label";

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("flex flex-col gap-4", className)} {...props} />;
}

function Field({ className, ...props }: React.ComponentProps<"div">) {
	return <div role="group" className={cn("grid gap-2", className)} {...props} />;
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
	return <Label className={cn(className)} {...props} />;
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p className={cn("text-muted-foreground text-xs", className)} {...props} />
	);
}

export { Field, FieldDescription, FieldGroup, FieldLabel };
