type Props = {
  message: string;
};

export function ErrorBanner({ message }: Props) {
  return (
    <div className="banner error" role="alert">
      {message}
    </div>
  );
}
