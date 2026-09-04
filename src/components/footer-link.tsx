import type { ReactNode } from "react";

type Props = {
  link: string;
  title: string;
  children: ReactNode;
};

export function FooterLink({ link, title, children }: Props) {
  return (
    <a
      href={link}
      title={title}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-primary underline-offset-2 transition-colors hover:underline"
    >
      {children}
    </a>
  );
}
