import React from "react";
import clsx from "clsx";

interface ClayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section";
  inset?: boolean;
  padded?: boolean;
}

export const ClayCard = React.forwardRef<HTMLDivElement, ClayCardProps>(
  ({ className, inset = false, padded = true, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          inset ? "clay-inset" : "clay-surface",
          padded && "p-5",
          className
        )}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
ClayCard.displayName = "ClayCard";
