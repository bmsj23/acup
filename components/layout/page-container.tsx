type PageContainerProps = {
  children: React.ReactNode;
};

export default function PageContainer({ children }: PageContainerProps) {
  return <main className="w-full px-6 py-6 lg:px-8">{children}</main>;
}