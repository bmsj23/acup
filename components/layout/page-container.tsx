type PageContainerProps = {
  children: React.ReactNode;
};

export default function PageContainer({ children }: PageContainerProps) {
  return (
    <main className="w-full max-w-1xl mx-auto m-6 rounded-4xl bg-white pt-0 pb-6 px-6 overflow-hidden">
      <div className="space-y-6">
        {children}
      </div>
    </main>
  );
}