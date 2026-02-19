import Nav from './Nav';

export default function AppShell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={`app-shell min-h-screen ${className}`}>
      <Nav />
      <div className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
        {children}
      </div>
    </main>
  );
}
