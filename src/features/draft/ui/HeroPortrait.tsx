import Image from "next/image";
import { Hero } from "@entities/hero/model/types";
import { getHeroImageUrl } from "@entities/hero/model/heroes";
import styles from "./draft-board.module.css";

interface Props {
  hero: Hero;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  taken?: boolean;
  banned?: boolean;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const sizes = { xs: 36, sm: 52, md: 68, lg: 88, xl: 96 };

export default function HeroPortrait({
  hero,
  size = "md",
  taken = false,
  banned = false,
  selected = false,
  onClick,
  disabled = false,
  className: extraClass,
}: Props) {
  const px = sizes[size];
  const className = [
    styles.portrait,
    styles[size],
    taken ? styles.taken : "",
    banned ? styles.banned : "",
    selected ? styles.selected : "",
    onClick && !disabled && !taken && !banned ? styles.clickable : "",
    extraClass ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <Image
        src={getHeroImageUrl(hero.slug)}
        alt={hero.name}
        width={px}
        height={Math.round(px * 1.45)}
        className={styles.portraitImg}
        unoptimized
      />
      <span className={styles.portraitName}>{hero.name}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        disabled={disabled || taken || banned}
        title={banned ? `${hero.name} — забанен` : hero.name}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className} title={hero.name}>
      {content}
    </div>
  );
}
