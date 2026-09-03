import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./ui.module.css";

export function SectionHeading({ title, description, href, linkLabel = "Xem tất cả" }: { title: string; description?: string; href?: string; linkLabel?: string }) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {href ? (
        <Link href={href} className={styles.sectionLink}>
          {linkLabel} <ArrowRight size={15} />
        </Link>
      ) : null}
    </div>
  );
}
