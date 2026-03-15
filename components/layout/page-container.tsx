type PageContainerProps = {
  children: React.ReactNode;
};

export default function PageContainer({ children }: PageContainerProps) {
  return (
    <main
      data-page-shell
      className="mx-auto m-6 w-full max-w-1xl overflow-hidden rounded-4xl bg-white px-6 pt-0 pb-6"
    >
      <div className="space-y-6">
        {children}
      </div>
    </main>
  );
}
