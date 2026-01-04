import { IoArrowBack } from "react-icons/io5";
import "./backButton.css";

export default function BackButton({ onBack }) {
  return (
    <button
      className="cs-back-circle"
      onClick={onBack}
      aria-label="Go back"
    >
      <IoArrowBack size={20} />
    </button>
  );
}


