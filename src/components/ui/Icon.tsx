export function Icon({ name, className = "", fill = false }: { name: string; className?: string; fill?: boolean }) {
  return <span className={`material-symbols-outlined ${fill ? "icon-fill" : ""} ${className}`}>{name}</span>;
}
