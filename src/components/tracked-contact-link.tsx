"use client";

import { AnchorHTMLAttributes, ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

type TrackedContactLinkProps = {
  eventName: string;
  eventPayload?: Record<string, string>;
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>;

export function TrackedContactLink({
  eventName,
  eventPayload,
  children,
  onClick,
  ...props
}: TrackedContactLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        trackEvent(eventName, eventPayload);
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
