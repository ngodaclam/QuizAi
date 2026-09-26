import { APP_LOGO, APP_NAME } from "../../config/brand";

export default function BrandLogo({ className = "h-10 w-10" }) {
  return (
    <span className={`inline-block shrink-0 overflow-hidden rounded-xl bg-white ${className}`}>
      <img
        src={APP_LOGO}
        alt={`Logo ${APP_NAME}`}
        className="h-full w-full object-cover scale-150"
        decoding="async"
      />
    </span>
  );
}
