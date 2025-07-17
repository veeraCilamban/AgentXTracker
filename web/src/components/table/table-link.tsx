import { cn } from "@/src/utils/tailwind";
import Link from "next/link";

export type TableLinkProps = {
  path: string;
  value: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
  title?: string;
};

export default function TableLink({
  path,
  value,
  icon,
  className,
  onClick,
  title,
}: TableLinkProps) {
  const handleClick = (event: React.MouseEvent) => {
    if (onClick) {
      event.preventDefault();
      onClick(event);
    }
  };

  return (
    <Link
  className={cn(
    "inline-block max-w-full overflow-hidden text-ellipsis text-nowrap rounded px-2 py-0.5 text-xs font-semibold shadow-sm",
    "bg-[#000000d] text-black hover:bg-[#000000f]", // <-- overrides here
    className,
  )}
  href={path}
  title={title || value}
  prefetch={false}
  onClick={handleClick}
>
  {icon ? icon : value}
</Link>

  );
}
