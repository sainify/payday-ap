import React from "react";
import clsx from "clsx";

interface ClayInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const ClayInput = React.forwardRef<HTMLInputElement, ClayInputProps>(
  ({ label, className, id, ...rest }, ref) => {
    return (
      <label className="block mb-4" htmlFor={id}>
        {label && (
          <span className="block mb-1.5 text-sm font-medium text-ink-soft dark:text-ink-faint">{label}</span>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(
            "w-full clay-inset px-4 py-3 text-base outline-none placeholder:text-ink-faint",
            "focus:ring-2 focus:ring-primary/40",
            className
          )}
          {...rest}
        />
      </label>
    );
  }
);
ClayInput.displayName = "ClayInput";

interface ClaySelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const ClaySelect = React.forwardRef<HTMLSelectElement, ClaySelectProps>(
  ({ label, className, id, children, ...rest }, ref) => {
    return (
      <label className="block mb-4" htmlFor={id}>
        {label && (
          <span className="block mb-1.5 text-sm font-medium text-ink-soft dark:text-ink-faint">{label}</span>
        )}
        <select
          ref={ref}
          id={id}
          className={clsx("w-full clay-inset px-4 py-3 text-base outline-none", className)}
          {...rest}
        >
          {children}
        </select>
      </label>
    );
  }
);
ClaySelect.displayName = "ClaySelect";
