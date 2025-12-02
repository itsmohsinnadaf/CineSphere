// src/components/common/ThemeToggle.jsx

export default function ThemeToggle({ theme, onToggle }) {
  return (
    <button className="cs-theme-toggle" onClick={onToggle}>
      {theme === "dark" ? "☀ Light" : "🌙 Dark"}
    </button>
  );
}
