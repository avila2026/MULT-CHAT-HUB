export const metadata = {
  title: 'MULT-CHAT-HUB Cloud',
  description: 'Plataforma híbrida de agentes LLM',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
