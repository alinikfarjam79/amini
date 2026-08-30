import { theme } from "../config/theme";

const BANNER_CONFIG = {
  warning: {
    classes: theme.colors.status.warning.banner,
    iconClass: theme.colors.status.warning.icon,
    icon: "⚠",
  },
  danger: {
    classes: theme.colors.status.danger.banner,
    iconClass: theme.colors.status.danger.icon,
    icon: "✕",
  },
  success: {
    classes: theme.colors.status.success.banner,
    iconClass: theme.colors.status.success.icon,
    icon: "✓",
  },
};

export const Banner = ({ variant, message }) => {
  const config = BANNER_CONFIG[variant] ?? BANNER_CONFIG.warning;
  return (
    <div
      dir="rtl"
      role="alert"
      className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm leading-relaxed ${config.classes}`}
    >
      <span
        className={`text-base mt-0.5 shrink-0 ${config.iconClass}`}
        aria-hidden="true"
      >
        {config.icon}
      </span>
      <span className="font-medium">{message}</span>
    </div>
  );
};
