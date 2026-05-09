const posts = [
  {
    title: "Spring Pest Checklist for Syracuse Homeowners",
    snippet: "A practical checklist to reduce spring ant and rodent activity before it starts.",
  },
  {
    title: "How to Spot Termite Risk Early",
    snippet: "Early indicators and when to schedule an inspection.",
  },
  {
    title: "Commercial Pest Prevention Basics",
    snippet: "Simple routines that reduce recurring pest pressure in business environments.",
  },
];

export default function BlogPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.18em] text-[#3f5a49]">Blog</p>
      <h1 className="mt-2 text-4xl text-[#15281f]">Pest Prevention Resources</h1>
      <p className="mt-4 max-w-3xl text-[#33453a]">Launch-ready resource center. Add and manage posts from your CMS in phase 2.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {posts.map((post) => (
          <article key={post.title} className="paper-panel rounded-2xl border border-[#d3c7ad] p-5">
            <h2 className="text-xl text-[#203328]">{post.title}</h2>
            <p className="mt-2 text-sm text-[#445349]">{post.snippet}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
