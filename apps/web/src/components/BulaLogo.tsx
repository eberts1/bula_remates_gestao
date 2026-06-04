interface BulaLogoProps {
  className?: string;
}

export function BulaLogo({ className = '' }: BulaLogoProps) {
  return (
    <div className={`bula-logo ${className}`.trim()}>
      <img
        src="/logo/logo-bula-remates.png"
        alt="Bula Remates"
        className="bula-logo-img bula-logo-img--light"
      />
      <img
        src="/logo/logo-bula-remates-branco.png"
        alt="Bula Remates"
        className="bula-logo-img bula-logo-img--dark"
      />
    </div>
  );
}
