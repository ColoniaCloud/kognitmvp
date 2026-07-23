import { useEffect, useState } from "react";

interface Props {
  src?: string | null;
  name: string;
  size?: number;
  shape?: "circle" | "square";
  className?: string;
}

export const Avatar = ({ src, name, size = 36, shape = "circle", className = "" }: Props) => {
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-2xl";
  // Si la foto no carga (borrada del bucket, URL del proveedor caída) mostramos las
  // iniciales en vez de dejar el ícono de imagen rota.
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className={`object-cover shrink-0 ${shapeClass} ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`bg-gradient-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 ${shapeClass} ${className}`}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
};
