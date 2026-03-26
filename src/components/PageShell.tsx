interface PageShellProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export default function PageShell({ title, description, children }: PageShellProps) {
  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold text-white">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      <div className="mt-8">{children}</div>
    </div>
  );
}
