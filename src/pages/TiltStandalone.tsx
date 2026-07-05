import { useNavigate } from "react-router-dom";
import { TiltScreen } from "./kognit/Tilt";

export default function TiltStandalone() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-deep md:flex md:items-center md:justify-center md:py-8">
      <div className="md:hidden h-dvh overflow-hidden">
        <TiltScreen onExit={() => nav("/")} />
      </div>
      <div className="hidden md:block max-w-md w-full mx-auto rounded-[2rem] overflow-hidden shadow-card">
        <TiltScreen onExit={() => nav("/")} />
      </div>
    </div>
  );
}
