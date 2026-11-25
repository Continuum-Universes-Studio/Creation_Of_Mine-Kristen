import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type TextLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export default function TextLink({ href, className, children }: TextLinkProps) {
  if (!href) return null;
  if (href.startsWith("http")) {
    return <a className={className} href={href} target="_blank" rel="noopener">{children}</a>;
  }
  if (href.startsWith("mailto:") || href.startsWith("#")) {
    return <a className={className} href={href}>{children}</a>;
  }
  return <Link className={className} to={href}>{children}</Link>;
}
