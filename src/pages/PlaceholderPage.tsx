type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section
      aria-label={`${title} placeholder`}
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <p className="text-sm font-medium text-teal-700">Placeholder</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        {description}
      </p>
    </section>
  );
}
