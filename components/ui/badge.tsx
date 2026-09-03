import type { BadgeTone } from "@/lib/types";
import styles from "./ui.module.css";

export function Badge({ children, tone = "slate", dot = false }: { children: React.ReactNode; tone?: BadgeTone; dot?: boolean }) {
  return (
    <span className={`${styles.badge} ${styles[`badge_${tone}`]}`}>
      {dot ? <span className={styles.badgeDot} /> : null}
      {children}
    </span>
  );
}
