import { createRoot } from "react-dom/client";
import { initI18n } from "@kognit/i18n/app";
import App from "./App.tsx";
import "@kognit/ui/index.css";
import "@fontsource/hind/300.css";
import "@fontsource/hind/400.css";
import "@fontsource/hind/500.css";
import "@fontsource/hind/600.css";
import "@fontsource/hind/700.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/500.css";
import "@fontsource/eb-garamond/600.css";
import "@fontsource/eb-garamond/400-italic.css";

// i18n se inicializa antes del primer render porque los idiomas que no son `es`
// se bajan en un chunk aparte: sin el await, un usuario en otro idioma vería la
// interfaz en español hasta que llegue su bundle.
initI18n().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
